package me.self.familytree.dao

import me.self.familytree.beans.Person
import org.neo4j.ogm.cypher.query.Pagination
import org.neo4j.ogm.session.SessionFactory
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FamilyTreeDao(
        @Inject val sessionFactory: SessionFactory
) {
    private val session by lazy { sessionFactory.openSession()!! }
    private val depthZero = 0
    private val depthOne = 1
    private val depthTwo = 2
    private val depthList = 5

    fun findPerson(personId: Long): Person? {
        return session.load(Person::class.java, personId, depthOne)
    }

    fun findPersonWithSecondRelation(personId: Long): Person? {
        return session.load(Person::class.java, personId, depthTwo)
    }

    fun listPersons(personId: Long?): Person? {
        val id = personId ?: (session.loadAll(Person::class.java,
                Pagination(0, 1))
                ?.firstOrNull()?.id?: return null)
        return session.load(Person::class.java, id, depthList)
    }

    fun upsertPerson(person: Person): Person? {
        session.save(person, depthTwo)
        return person.id?.let { findPerson(it) }
    }

    fun upsertPersonProperties(person: Person): Person? {
        session.save(person, depthZero)
        return person.id?.let { findPerson(it) }
    }
}
