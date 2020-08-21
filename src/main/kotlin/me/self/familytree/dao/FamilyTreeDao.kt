package me.self.familytree.dao

import me.self.familytree.beans.Person
import org.neo4j.driver.Driver
import org.neo4j.ogm.drivers.bolt.driver.BoltDriver
import org.neo4j.ogm.session.SessionFactory
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FamilyTreeDao(
        @Inject val driver: Driver
) {
    private val session by lazy { SessionFactory(BoltDriver(driver), "me.self.familytree.beans").openSession()!! }
    private val depth = 1;
    private val depthOnly = 0;

    fun findPerson(personId: Long): Person? {
        return session.load(Person::class.java, personId, depth)
    }

    fun upsertPerson(person: Person): Person? {
        session.save(person, depth)
        return person.id?.let { findPerson(it) }
    }
}
