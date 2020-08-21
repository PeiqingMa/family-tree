package me.self.familytree.dao

import io.micronaut.test.annotation.MicronautTest
import me.self.familytree.beans.Gender
import me.self.familytree.beans.Person
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

@MicronautTest
class FamilyTreeDaoTest(private val familyTreeDao: FamilyTreeDao) {

    @Test
    fun testCreatePerson() {
        val name = "Axee Bces"
        val person = Person()
        person.names = listOf(name)
        person.bioGender = Gender.Male
        person.socialGender = person.bioGender?.name
        val saved = familyTreeDao.upsertPerson(person)
        assertNotNull(saved?.id)
        assertTrue(saved?.names?.firstOrNull() == name)
        val another = Person()
        val anotherName = "Another Name"
        another.names = listOf(anotherName)
        another.bioGender = Gender.Female
        another.socialGender = another.bioGender?.name
        person.bioMother = another
        person.parents = listOf(another)
        person.id = saved?.id
        val updated = familyTreeDao.upsertPerson(person)
        assertNotNull(updated?.bioMother)
        assertTrue(updated?.bioMother?.names?.firstOrNull() == anotherName)
    }

}
